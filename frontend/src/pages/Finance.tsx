import { useAuth } from '../contexts/AuthContext';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { PayablesTab } from '../components/finance/PayablesTab';
import { CashflowTab } from '../components/finance/CashflowTab';

export function Finance() {
  const { user } = useAuth();
  const isSuperadmin = user?.role === 'superadmin';

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Finance</h1>
        <p className="mt-1 text-gray-600">Manage payables, cashflow, and financial reporting</p>
      </div>

      <Tabs defaultValue="payables">
        <TabsList>
          <TabsTrigger value="payables">Payables</TabsTrigger>
          {isSuperadmin && <TabsTrigger value="cashflow">Cashflow</TabsTrigger>}
        </TabsList>

        <TabsContent value="payables">
          <PayablesTab />
        </TabsContent>

        {isSuperadmin && (
          <TabsContent value="cashflow">
            <CashflowTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
