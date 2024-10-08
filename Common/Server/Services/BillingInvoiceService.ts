import FindBy from "../Types/Database/FindBy";
import { OnFind } from "../Types/Database/Hooks";
import BillingService, { Invoice } from "./BillingService";
import DatabaseService from "./DatabaseService";
import ProjectService from "./ProjectService";
import URL from "../../Types/API/URL";
import { LIMIT_PER_PROJECT } from "../../Types/Database/LimitMax";
import BadDataException from "../../Types/Exception/BadDataException";
import Model, {
  InvoiceStatus,
} from "Common/Models/DatabaseModels/BillingInvoice";
import Project from "Common/Models/DatabaseModels/Project";

export class Service extends DatabaseService<Model> {
  public constructor() {
    super(Model);
    this.setDoNotAllowDelete(true);
  }

  protected override async onBeforeFind(
    findBy: FindBy<Model>,
  ): Promise<OnFind<Model>> {
    if (!findBy.props.tenantId) {
      throw new BadDataException("ProjectID not found.");
    }

    const project: Project | null = await ProjectService.findOneById({
      id: findBy.props.tenantId!,
      props: {
        ...findBy.props,
        isRoot: true,
        ignoreHooks: true,
      },
      select: {
        _id: true,
        paymentProviderCustomerId: true,
      },
    });

    if (!project) {
      throw new BadDataException("Project not found");
    }

    if (!project.paymentProviderCustomerId) {
      throw new BadDataException("Payment provider customer id not found.");
    }

    const invoices: Array<Invoice> = await BillingService.getInvoices(
      project.paymentProviderCustomerId,
    );

    await this.deleteBy({
      query: {
        projectId: findBy.props.tenantId!,
      },
      limit: LIMIT_PER_PROJECT,
      skip: 0,
      props: {
        isRoot: true,
        ignoreHooks: true,
      },
    });

    for (const invoice of invoices) {
      const billingInvoice: Model = new Model();

      billingInvoice.projectId = project.id!;

      billingInvoice.amount = invoice.amount;
      billingInvoice.downloadableLink = URL.fromString(
        invoice.downloadableLink,
      );
      billingInvoice.currencyCode = invoice.currencyCode;
      billingInvoice.paymentProviderCustomerId = invoice.customerId || "";
      billingInvoice.paymentProviderSubscriptionId =
        invoice.subscriptionId || "";
      billingInvoice.status =
        (invoice.status as InvoiceStatus) || InvoiceStatus.Undefined;
      billingInvoice.paymentProviderInvoiceId = invoice.id;
      billingInvoice.invoiceDate = invoice.invoiceDate;
      billingInvoice.invoiceNumber = invoice.invoiceNumber || "Unknown";

      await this.create({
        data: billingInvoice,
        props: {
          isRoot: true,
        },
      });
    }

    return { findBy, carryForward: invoices };
  }
}

export default new Service();
